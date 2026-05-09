# syntax=docker/dockerfile:1.7

FROM node:24.11.1-alpine AS build
WORKDIR /app
COPY --link package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY --link . .
RUN npm run build

FROM nginx:1.29.4-alpine
COPY --link --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
