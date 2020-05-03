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

const assert = require('assert')

function int_to_buffer(v) {
    assert(typeof v === "number")
    
    if(v < 0) { 
        // currently not needed
        console.error('TODO int_to_buffer');
    }
    
    if(v < (1 << 7)) {
        return Buffer.from([v])
    }
    else if(v < (1 << 14)) {
        let buf = Buffer.alloc(2);
        buf[0] = 128 | (v & 127);
        v >>= 7;
        buf[1] = v;
        return buf;
    }
    else if(v < (1 << 21)) {
        let buf = Buffer.alloc(3);
        buf[0] = 128 | (v & 127);
        v >>= 7;
        buf[1] = 128 | (v & 127);
        v >>= 7;
        buf[2] = v;
        return buf;
    }
    else if(v < (1 << 28)) {
        let buf = Buffer.alloc(4);
        buf[0] = 128 | (v & 127);
        v >>= 7;
        buf[1] = 128 | (v & 127);
        v >>= 7;
        buf[2] = 128 | (v & 127);
        v >>= 7;
        buf[3] = v;
        return buf;
    }
    else {
        let buf = Buffer.alloc(5);
        buf[0] = 128 | (v & 127);
        v >>= 7;
        buf[1] = 128 | (v & 127);
        v >>= 7;
        buf[2] = 128 | (v & 127);
        v >>= 7;
        buf[3] = 128 | (v & 127);
        v >>= 7;
        buf[4] = v;
        return buf;
    }
}
function string_to_buffer(s) {
    return Buffer.concat([int_to_buffer(s.length), Buffer.from(s)]);
}
function uint16_to_buffer(v) {
    assert((v >= 0) && (v <= 65535));
    let buf = Buffer.alloc(2);
    buf[0] = v & 255;
    buf[1] = v >> 8;
    return buf;
}

const ConvertState = { OK : 0, INCOMPLETE_DATA : -1, INVALID_DATA : -2 };

// returns: [state, converted_integer, offset_new]
function try_buffer_to_int(buf, offset) {
    if(buf.length <= 0) {
        return [ConvertState.INCOMPLETE_DATA, 0, offset];
    }
    
    let offset_new = offset;
    let v = 0;
    while((buf[offset_new] & 128) > 0) {
        if(offset_new - offset > 4) {
            // this is too long
            return [ConvertState.INVALID_DATA, 0, offset_new];
        }
    
        // zeros shifted from the right (according to MDN)
        v |= (buf[offset_new] & 127) << ((offset_new - offset) * 7);
        offset_new++;
        
        if(buf.length <= offset_new) {
            return [ConvertState.INCOMPLETE_DATA, 0, offset];
        }
    }
    v |= buf[offset_new] << ((offset_new - offset) * 7);
    offset_new++;
    
    return [ConvertState.OK, v, offset_new];
}

module.exports = {
    int_to_buffer,
    string_to_buffer,
    uint16_to_buffer,
    ConvertState,
    try_buffer_to_int
};
