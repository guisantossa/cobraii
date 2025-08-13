# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app

# Copia manifestos primeiro para cache de deps
COPY package*.json ./
RUN npm ci

# Build
COPY . .
# Se precisar injetar variável em build (Vite):
# ARG VITE_API_BASE_URL
# ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
RUN npm i -g serve
COPY --from=build /app/dist ./dist

EXPOSE 3000
# -s = single page app (fallback p/ index.html)
CMD ["serve", "-s", "dist", "-l", "3000"]
