/* Copyright (C) 2020 Matthias Rosenthal
 * 
 * This file is part of minecraft_status_bridge.
 *
 * minecraft_status_bridge is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 * minecraft_status_bridge is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with stocks_dl. If not, see <http://www.gnu.org/licenses/>
 **********************************************************************/

const net = require('net');

const mcdata = require('./data');

const DEFAULT_PROTOCOL_VERSION = 485;
const DEFAULT_SERVER_TIMEOUT = 35000;
const DEFAULT_PORT = 25565;

const STATE_STATUS = 1;

const ParsingState = { START : 0, SIZE : 1, END : 2 };

class Fetcher {
    // protocol_version and server_timeout are optional
    constructor(protocol_version, server_timeout) {
        this.protocol_version = protocol_version ? protocol_version : DEFAULT_PROTOCOL_VERSION;
        this.server_timeout = server_timeout ? server_timeout : DEFAULT_SERVER_TIMEOUT;
    }
    
    query(host, port, handler, error_handler) {
        let self = this // the meaning of this may change, e. g. in a
        // handler like client.on('error', function(e) {...})
    
        if(!port) {
            port = DEFAULT_PORT;
        }
    
        const cclient = net.createConnection({ port: port, host: host }, () => {
            self._write_handshake(connection.client, host, port, STATE_STATUS);
            self._write_status_request(connection.client);
        });
        let connection = {
            client: cclient,
            received_data: Buffer.alloc(0),
            parsed_size: 0,
            parsing_state: ParsingState.START,
            current_offset: 0,
            handler: handler,
            error_handler: error_handler,
        };

        connection.client.setTimeout(self.server_timeout, 
            function() {
                self._handle_error(connection, `Timeout ${self.server_timeout} ms reached`)
                // according to https://nodejs.org/api/net.html#net_socket_settimeout_timeout_callback,
                // the client must manually end the connection
                connection.client.destroy() // client.end() does not resolve when the connection failed
            }
        );

        // The client can also receive data from the server by reading from its socket.
        connection.client.on('data', function(chunk) {
            connection.received_data = Buffer.concat([connection.received_data, chunk]);
            //console.log(`Data received from the server: ${chunk.toString('binary')} ${chunk.toString('hex')}.`);
            
            if(connection.parsing_state == ParsingState.START) {
                let state, size, offset;
                [state, size, offset] = mcdata.try_buffer_to_int(connection.received_data, 0);
                if(state == mcdata.ConvertState.OK) {
                    if(size < 0) {
                        self._handle_error(connection, 'received size < 0 from server');
                        connection.client.end();
                    }
                    else {
                        connection.parsed_size = size;
                        connection.current_offset = offset;
                        connection.parsing_state = ParsingState.SIZE;
                    }
                }
                else if(state != mcdata.ConvertState.INCOMPLETE_DATA) {
                    self._handle_error(connection, 
                          `invalid data received from server: ${connection.received_data.toString('hex')}`);
                    connection.client.end();
                }
                // else: wait for more data to complete the size integer
            }
            
            if(connection.parsing_state == ParsingState.SIZE) {
                if(connection.received_data.length - connection.current_offset > connection.parsed_size) {
                    self._handle_error(connection, 'received too much data from server:', 
                        connection.received_data.length - connection.current_offset, 
                        'instead of the indicated', connection.parsed_size, 'bytes');
                    connection.client.end();
                }
                else if(connection.received_data.length - connection.current_offset == connection.parsed_size) {
                    connection.client.end(); // answer complete
                    
                    if(connection.received_data[connection.current_offset] != 0) { // check id
                        self._handle_error(connection, 'received packet with id =',
                              connection.received_data[connection.current_offset]);
                    }
                    else {
                        connection.current_offset++;
                        let state, size, offset;
                        [state, size, offset] = mcdata.try_buffer_to_int(connection.received_data,
                              connection.current_offset);
                        if(state == mcdata.ConvertState.OK) {
                            if(size < 0) {
                                self._handle_error(connection, 'received json size < 0 from server');
                            }
                            else {
                                connection.current_offset = offset;
                                const actual_size = connection.received_data.length - connection.current_offset;
                                if(actual_size == size) {
                                    let status = null;
                                    try {
                                        status = JSON.parse(connection.received_data.toString('utf8',
                                            connection.current_offset));
                                        connection.parsing_state = ParsingState.END;
                                    }
                                    catch(error) {
                                        self._handle_error(connection, 'Error while parsing status JSON:', error);
                                    }
                                    
                                    // do this outside the try-catch if the handler
                                    // throws an exception
                                    if(status) {
                                        connection.handler(status);
                                    }
                                }
                                else {
                                    self._handle_error(connection, 
                                          `received json size ${size} != actual size ${actual_size}`);
                                }
                            }
                        }
                        else {
                            // the json data must be completely received now (because 
                            // we checked before that we received the entire message)
                            self._handle_error(connection, 'received invalid json size from server');
                        }
                    }
                }
                // else: wait for more data to complete the message
            }
        });

        connection.client.on('end', function() {
            //console.log('Requested an end to the TCP connection');
        });

        connection.client.on('error', function(error) {
            self._handle_error(connection, 'TCP Connection', error);
        });
    }

    _write_handshake(client, server_address, server_port, next_state) {
        const id = 0;
        const buf = Buffer.concat([mcdata.int_to_buffer(id),
            mcdata.int_to_buffer(this.protocol_version),
            mcdata.string_to_buffer(server_address),
            mcdata.uint16_to_buffer(server_port),
            mcdata.int_to_buffer(next_state)]);
        const buf_with_size = Buffer.concat([mcdata.int_to_buffer(buf.length),
            buf]);
        client.write(buf_with_size);
    }

    _write_status_request(client) {
        const id = 0;
        const buf = mcdata.int_to_buffer(id);
        const buf_with_size = Buffer.concat([mcdata.int_to_buffer(buf.length),
            buf]);
        client.write(buf_with_size);
    }
    
    // error_object is optional
    _handle_error(connection, msg, error_object) {
        // check whether we do not already have ended in case of multiple errors
        if(connection.state != ParsingState.END) {
            if(error_object) {
                error_object.message = msg + ': ' + error_object.message;
                connection.error_handler(error_object);
            }
            else {
                connection.error_handler(msg);
            }
            
            connection.state = ParsingState.END;
        }
    }
}

module.exports = {
    DEFAULT_PROTOCOL_VERSION,
    DEFAULT_SERVER_TIMEOUT,
    DEFAULT_PORT,
    Fetcher,
};
