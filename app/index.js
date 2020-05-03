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

const express = require('express');
const router = express.Router();

const query = require('./query')

const my_fetcher = new query.Fetcher()

router.get('/', (request, response) => {
    if(!('host' in request.query)) {
        response.send('No host');
        return;
    }
    const host = request.query.host
    
    let port = query.DEFAULT_PORT
    if('port' in request.query) {
        port = Number(request.query.port) // NaN if invalid
        if(port < 0 && port > 65535) {
            response.send('Invalid port', port);
            return;
        }
    }
    
    // This is the actual query
    my_fetcher.query(host, port, function(status) {
            //console.log('fetched status: %o', status);
            response.send(status);
        },
        function(error) {
            console.error('Error when querying %s:%d:', host, port, error);
            response.send('Error: ' + error.toString());
        })
});

module.exports = router;
