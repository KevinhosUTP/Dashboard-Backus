# Etapa 1: Construcción
FROM node:18-alpine AS build

WORKDIR /app

# Copiamos dependencias
COPY package.json package-lock.json* ./
RUN npm install

# Copiamos el resto del código
COPY . .

# --- PUENTE OBLIGATORIO PARA VITE ---
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
# ------------------------------------

# Construimos la aplicación
RUN npm run build

# Etapa 2: Servidor
FROM nginx:alpine

# Copiamos los archivos estáticos de Vite a Nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
