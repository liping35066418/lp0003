#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "=============================================="
echo "  🚴 开发模式启动 (含热更新)"
echo "=============================================="

mkdir -p "$BACKEND_DIR/data"
mkdir -p "$BACKEND_DIR/uploads"

echo ""
echo "📍 后端服务: http://127.0.0.1:8603"
echo "🌐 前端地址: http://127.0.0.1:3603"
echo "🔐 管理员: admin / admin123"
echo "👤 普通成员: zhangsan / 123456"
echo "=============================================="

cleanup() {
  echo ""
  echo "🛑 停止中..."
  [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
  [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
  wait 2>/dev/null
  exit 0
}
trap cleanup INT TERM

cd "$BACKEND_DIR"
npm run dev &
BACKEND_PID=$!

sleep 2

cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

wait
