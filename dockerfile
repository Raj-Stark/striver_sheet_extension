
FROM node:18-alpine

WORKDIR /app
RUN apk add chromium


#Install dependencies 
COPY package.json ./




#Run npm install

RUN npm i


#Bundle app src
COPY . .

EXPOSE 8080

CMD ["npm" , "start"]