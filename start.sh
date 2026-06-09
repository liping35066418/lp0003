#!/bin/bash

echo "=============================================="
echo "  🚴 户外骑行俱乐部管理系统 - 启动脚本"
echo "=============================================="

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo ""
echo "[1/4] 检查目录结构..."
if [ ! -d "$BACKEND_DIR/node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "⚠️  检测到依赖未安装，开始安装依赖..."
  cd "$ROOT_DIR"
  npm install --silent 2>/dev/null || true
  cd "$BACKEND_DIR" && npm install --silent
  cd "$FRONTEND_DIR" && npm install --silent
  echo "✅ 依赖安装完成"
else
  echo "✅ 依赖已安装"
fi

echo ""
echo "[2/4] 创建必要目录..."
mkdir -p "$BACKEND_DIR/data"
mkdir -p "$BACKEND_DIR/uploads"
echo "✅ 目录已就绪"

echo ""
echo "[3/4] 检查端口占用..."
check_port() {
  if lsof -ti:$1 > /dev/null 2>&1; then
    echo "⚠️  端口 $1 已被占用，尝试释放..."
    lsof -ti:$1 | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}
check_port 8603
check_port 3603
echo "✅ 端口就绪"

echo ""
echo "[4/4] 启动服务..."
echo ""
echo "📍 后端服务: http://127.0.0.1:8603"
echo "🌐 前端地址: http://127.0.0.1:3603"
echo "🔐 管理员账号: admin / admin123"
echo "👤 测试成员号: zhangsan / 123456"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo "=============================================="

cleanup() {
  echo ""
  echo "🛑 正在停止服务..."
  [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
  wait 2>/dev/null
  echo "✅ 服务已停止"
  exit 0
}
trap cleanup INT TERM

cd "$BACKEND_DIR"
npm start &
BACKEND_PID=$!

sleep 3

cd "$FRONTEND_DIR"
npm run preview &
FRONTEND_PID=$!

wait
