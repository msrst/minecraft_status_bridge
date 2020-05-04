# Copyright (C) 2020 Matthias Rosenthal
# 
# This file is part of minecraft_status_bridge.
#
# minecraft_status_bridge is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# any later version.
# minecraft_status_bridge is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# You should have received a copy of the GNU General Public License
# along with minecraft_status_bridge. If not, see <http://www.gnu.org/licenses/>
 
FROM node:10

COPY LICENSE index.js package.json package-lock.json /app/
COPY app /app/app

WORKDIR /app

RUN npm install

EXPOSE 4100

CMD ["node", "."]
