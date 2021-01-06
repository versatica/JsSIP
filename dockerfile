FROM node:14

WORKDIR /usr/jssip

COPY . /usr/jssip

RUN npm install
RUN npm install -g gulp-cli
