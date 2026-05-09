# Gunakan Nginx sebagai base image yang ringan
FROM nginx:stable-alpine

# Salin semua file proyek ke dalam direktori default Nginx
COPY . /usr/share/nginx/html

# Expose port 80 untuk akses web
EXPOSE 80

# Jalankan Nginx
CMD ["nginx", "-g", "daemon off;"]
