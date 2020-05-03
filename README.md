# Minecraft Status Bridge

Every Minecraft Server offers a Status Handshake, which can be used to query the MOTD, current players and more.  
minecraft_server_bridge is a nodejs server which allows to query this as JSON from a REST endpoint:

`curl 'http://localhost:4100/?host=mc.gsservers.net'`


    {
    "description": {
        "text": "§r           §3§lGS§b§lServers §8§l➤ §61.15.2 Survival\n §a§lJobs §8§l◆ §9§lMcMMMO §8§l◆ §e§lEvents §8§l◆ §d§lDiscord §8§l◆ §c§lCrates"
    },
    "players": {
        "max": 35,
        "online": 4,
        "sample": [
        {
            "id": "e3478fa5-d6d6-4613-8649-693e9885783b",
            "name": "SmolTiddyLoliGF"
        },
        {
            "id": "b7dc721f-2103-4af5-8ec0-76048e472780",
            "name": "Nosturimies"
        },
        {
            "id": "643de34c-ecbd-4957-8e0d-0f09bbaecd71",
            "name": "Hedhed"
        },
        {
            "id": "60f0d204-2eb9-4f5f-a486-1bea15cf8d63",
            "name": "Tracy_Grimshaw"
        }
        ]
    },
    "version": {
        "name": "Paper 1.15.2",
        "protocol": 578
    },
    "favicon": "data:image/png;base64,iVBORw0 ... (FAVICON SHORTENED)"
    }
    
(This was done on 1st May 2020 on a server I randomly selected from server lists, maybe the server is down now. I shortened the favicon base64 string here and also changed the player's UUIDs to a random one to protect their privacy.)

The bridge can be used, for example, to input the data to another tool like [huginn](https://github.com/huginn/huginn/).  
Another use case would be to display the current status on your website.

## REST Endpoint

`http://localhost:4100/?host=<host>&port=<port>`

The default value for port is 25565 (default minecraft port).  
Host can be an ip adress or a domain name.  

## Library usage

In case a REST server is not needed, the files app/query.js and app/data.js contain the necessary functions.  

Example:

    const query = require('./query')

    const host = 'mc.gsservers.net'
    const port = 25565

    const my_fetcher = new query.Fetcher();
    my_fetcher.query(host, port, function(status) {
            console.log('Fetched status: %o', status);
        },
        function(error) {
            console.error('Error:', error);
        });

## License

Copyright (C) Matthias Rosenthal  
License: [GPL3](./License)  
Applies to all files
