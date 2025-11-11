# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci --include=dev

# Copy source and build for production
COPY . .

ARG VITE_APP_TOKEN
ARG VITE_API_KEY
ARG VITE_MAP_STYLE_URL
ENV VITE_APP_TOKEN=${VITE_APP_TOKEN}
ENV VITE_API_KEY=${VITE_API_KEY}
ENV VITE_MAP_STYLE_URL=${VITE_MAP_STYLE_URL}
ENV NODE_ENV=production

RUN npm run build

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist .

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
