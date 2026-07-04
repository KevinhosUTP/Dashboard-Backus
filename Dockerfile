# Etapa 1: Construcción
FROM node:20-alpine AS build

WORKDIR /app

# Copiamos dependencias
COPY package.json package-lock.json* ./
RUN npm install

# Copiamos el resto del código
COPY . .

# --- OPCIÓN NUCLEAR: CLAVES DIRECTAS ---
ENV VITE_SUPABASE_URL="https://gwedhslwoexyjitkmeke.supabase.co/rest/v1/"
ENV VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3ZWRoc2x3b2V4eWppdGttZWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDU3NTIsImV4cCI6MjA4MDcyMTc1Mn0.jCUlETAbcxp9--NmCfjBV_9cUZve8xqsBfgTmaxJ7aM"
# ---------------------------------------

# Construimos la aplicación
RUN npm run build

# Etapa 2: Servidor
FROM nginx:alpine

# Copiamos los archivos estáticos de Vite a Nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
