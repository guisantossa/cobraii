# build
FROM node:20.19 as builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
 
HEALTHCHECK CMD curl --fail http://localhost || exit 1