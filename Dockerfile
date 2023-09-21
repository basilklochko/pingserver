FROM node:10

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
RUN npm install -g typescript
RUN sh -c tsc -p dist/client
RUN sh -c tsc

# Bundle app source
COPY . .

EXPOSE 3003
# CMD [ "node", "server.js" ]
CMD ["node", "./dist/server/app"]