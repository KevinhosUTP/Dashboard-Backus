# Etapa 1: Construcción
FROM node:20-alpine AS build

WORKDIR /app

# Copiamos dependencias
COPY package.json package-lock.json* ./
RUN npm install

# Copiamos el resto del código (AQUÍ COPIARÁ EL .env.production AUTOMÁTICAMENTE)
COPY . .

# Construimos la aplicación
RUN npm run build

# Etapa 2: Servidor
FROM nginx:alpine

# Copiamos los archivos estáticos de Vite a Nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
