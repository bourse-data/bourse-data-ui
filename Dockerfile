FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_CODAL_API_BASE_URL=/api/codal/codal
ARG VITE_CODAL_REFRESH_INTERVAL_MS=600000
ARG VITE_API_ERROR_RETRY_MS=15000
ENV VITE_CODAL_API_BASE_URL=$VITE_CODAL_API_BASE_URL
ENV VITE_CODAL_REFRESH_INTERVAL_MS=$VITE_CODAL_REFRESH_INTERVAL_MS
ENV VITE_API_ERROR_RETRY_MS=$VITE_API_ERROR_RETRY_MS
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN find /usr/share/nginx/html -type d -exec chmod 0755 {} + && \
    find /usr/share/nginx/html -type f -exec chmod 0644 {} +
EXPOSE 8081
