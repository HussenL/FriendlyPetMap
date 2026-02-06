FROM public.ecr.aws/docker/library/python:3.11-slim

# 基础环境
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 系统依赖（如你不需要编译包，可把 build-essential 去掉）
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
  && rm -rf /var/lib/apt/lists/*

# 先拷贝依赖文件以利用缓存
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# 再拷贝代码
COPY backend /app/backend

# 关键：让 Python 能找到 "app.*"
ENV PYTHONPATH=/app/backend

EXPOSE 8000

# 生产建议：先用单进程（ECS 上稳定后再加 workers）
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
