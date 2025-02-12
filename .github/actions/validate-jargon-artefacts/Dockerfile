FROM node:21-alpine

COPY package*.json /

RUN npm ci

COPY validation.js /validation.js

CMD ["node", "/validation.js"]