# Этап сборки React-приложения
FROM node:20-alpine as build
WORKDIR /app

# Копируем package.json
COPY package*.json ./
RUN npm ci

# Копируем остальной код
COPY . ./

# Собираем приложение
# Передаем переменную, чтобы фронтенд знал, что он в продакшене
ENV VITE_API_URL=/api
RUN npm run build

# Этап Nginx
FROM nginx:alpine

# Копируем собранные файлы в папку nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Копируем наш файл конфигурации Nginx, чтобы настроить роутинг и проксирование
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
