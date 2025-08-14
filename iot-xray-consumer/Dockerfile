# مرحله 1: Build stage
# از ایمیج node با ورژن 18 و سیستم عامل alpine استفاده می‌کند
FROM node:18-alpine AS builder

# دایرکتوری کاری را در داخل کانتینر تنظیم می‌کند
WORKDIR /app

# فایل‌های package.json و package-lock.json را کپی می‌کند
COPY package.json package-lock.json ./

# وابستگی‌های پروژه را نصب می‌کند
RUN npm install

# تمام فایل‌های پروژه را به دایرکتوری کاری کپی می‌کند
COPY . .

# پروژه را build می‌کند. این دستور باید فایل‌های JavaScript را در دایرکتوری 'dist' ایجاد کند.
RUN npm run build

# مرحله 2: Run stage
# از یک ایمیج کوچکتر node برای اجرای برنامه نهایی استفاده می‌کند
FROM node:18-alpine

# دایرکتوری کاری را در داخل کانتینر تنظیم می‌کند
WORKDIR /app

# فایل‌های build شده و node_modules را از مرحله قبلی کپی می‌کند
# اگر خطای 'Cannot find module' رخ می‌دهد، به این معنی است که 'dist' در مرحله build ایجاد نشده یا محتوای آن صحیح نیست.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# پورت مورد نیاز برنامه را expose می‌کند
# برای producer از EXPOSE 3001 استفاده می‌کنیم
EXPOSE 3000

# دستور اجرای برنامه را مشخص می‌کند. این دستور فایل 'main.js' را در 'dist' اجرا می‌کند.
# اسکریپت start:prod در package.json نیز باید همین کار را انجام دهد.
CMD ["node", "dist/main"]