/**
 * components/Lobby.tsx
 * 大厅界面：创建房间、加入房间、单人模式、玩家列表
 */

import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { useSinglePlayer } from '../hooks/useSinglePlayer';

// 每个玩家颜色索引对应的颜色展示
const COLOR_MAP: Record<number, string> = {
  0: '#06b6d4',
  1: '#ec4899',
  2: '#facc15',
  3: '#22c55e',
};

const Lobby: React.FC = () => {
  const { createRoom, joinRoom, setReady, startGame } = useSocket();
  const { startSinglePlayer, isSinglePlayer, aiCount, setAiCount } = useSinglePlayer();

  const {
    connected,
    roomId,
    roomName,
    mySocketId,
    myName,
    setMyName,
    players,
    messages,
  } = useGameStore();

  // 表单状态
  const [inputName,     setInputName]     = useState('');
  const [inputRoomName, setInputRoomName] = useState('霓虹赛场');
  const [inputRoomId,   setInputRoomId]   = useState('');
  const [isReady,       setIsReady]       = useState(false);
  const [errMsg,        setErrMsg]        = useState('');
  const [loading,       setLoading]       = useState(false);

  // 我的玩家信息
  const me = players.find((p) => p.id === mySocketId);

  // ── 创建房间 ──
  const handleCreate = async () => {
    if (!inputName.trim()) return setErrMsg('请输入昵称');
    setLoading(true);
    setErrMsg('');
    useGameStore.getState().setMyName(inputName.trim());
    const res = await createRoom({
      roomName: inputRoomName.trim() || '霓虹赛场',
      playerName: inputName.trim(),
    });
    setLoading(false);
    if (!res.ok) setErrMsg(res.error ?? '创建失败');
  };

  // ── 加入房间 ──
  const handleJoin = async () => {
    if (!inputName.trim())   return setErrMsg('请输入昵称');
    if (!inputRoomId.trim()) return setErrMsg('请输入房间号');
    setLoading(true);
    setErrMsg('');
    useGameStore.getState().setMyName(inputName.trim());
    const res = await joinRoom({
      roomId: inputRoomId.trim().toUpperCase(),
      playerName: inputName.trim(),
    });
    setLoading(false);
    if (!res.ok) setErrMsg(res.error ?? '加入失败');
  };

  // ── 开始单人模式 ──
  const handleStartSinglePlayer = () => {
    if (!inputName.trim()) return setErrMsg('请输入昵称');
    setErrMsg('');
    useGameStore.getState().setMyName(inputName.trim());
    startSinglePlayer(inputName.trim(), aiCount);
  };

  // ── 准备 / 取消准备 ──
  const handleReady = () => {
    const next = !isReady;
    setIsReady(next);
    setReady(next);
  };

  // ── 开始游戏（房主）──
  const handleStart = async () => {
    setLoading(true);
    const res = await startGame();
    setLoading(false);
    if (!res.ok) setErrMsg(res.error ?? '开始游戏失败');
  };

  const isHost = players.length > 0 && players[0].id === mySocketId;

  // ──────────────────────────────────────────────
  // 渲染
  // ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-4">
      {/* 标题 */}
      <h1 className="text-4xl font-extrabold tracking-widest text-cyan-400 mb-2 drop-shadow-[0_0_12px_#06b6d4]">
        NEON DISTRICT RACING
      </h1>
      <p className="text-gray-500 text-sm mb-8">格子 × 卡牌 赛车游戏</p>

      {/* 连接状态 */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}
        />
        <span className="text-xs text-gray-400">
          {connected ? '已连接' : '连接中...'}
        </span>
      </div>

      {/* 未加入房间：显示表单 */}
      {!roomId && !isSinglePlayer ? (
        <div className="w-full max-w-md bg-gray-900 border border-cyan-900 rounded-2xl p-6 space-y-4 shadow-xl">
          {/* 昵称 */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">玩家昵称</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              placeholder="输入你的昵称..."
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
            />
          </div>

          {/* 单人模式 */}
          <div className="border-t border-gray-800 pt-4">
            <label className="block text-xs text-gray-400 mb-2">🤖 单人模式（与 AI 对战）</label>
            <div className="flex gap-2 mb-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setAiCount(n)}
                  className={`flex-1 py-1 rounded-lg text-sm font-medium transition ${
                    aiCount === n
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {n} 个 AI
                </button>
              ))}
            </div>
            <button
              onClick={handleStartSinglePlayer}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2 rounded-lg transition"
            >
              🎮 开始单人模式
            </button>
          </div>

          {/* 分割线 */}
          <div className="border-t border-gray-800 pt-4 relative">
            <div className="absolute inset-x-0 -top-2 flex justify-center">
              <span className="bg-gray-900 px-2 text-xs text-gray-600">或</span>
            </div>
          </div>

          {/* 创建房间 */}
          <div className="border-t border-gray-800 pt-4">
            <label className="block text-xs text-gray-400 mb-1">房间名称</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-cyan-500"
              placeholder="霓虹赛场"
              value={inputRoomName}
              onChange={(e) => setInputRoomName(e.target.value)}
            />
            <button
              onClick={handleCreate}
              disabled={loading || !connected}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition"
            >
              🏠 创建新房间
            </button>
          </div>

          {/* 加入房间 */}
          <div className="border-t border-gray-800 pt-4">
            <label className="block text-xs text-gray-400 mb-1">房间号</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-pink-500 uppercase"
              placeholder="输入 6 位房间号..."
              value={inputRoomId}
              onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button
              onClick={handleJoin}
              disabled={loading || !connected}
              className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition"
            >
              🚪 加入房间
            </button>
          </div>

          {errMsg && <p className="text-red-400 text-xs text-center">{errMsg}</p>}
        </div>
      ) : isSinglePlayer ? (
        /* 单人模式游戏进行中 - 由 GameBoard 接管 */
        null
      ) : (
        /* 已在房间：显示玩家列表 */
        <div className="w-full max-w-md space-y-4">
          {/* 房间信息 */}
          <div className="bg-gray-900 border border-cyan-900 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-cyan-400 font-bold text-lg">{roomName}</span>
              <span className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-1 rounded">
                {roomId}
              </span>
            </div>
            <p className="text-gray-500 text-xs">将房间号分享给朋友，最多 4 人</p>
          </div>

          {/* 玩家列表 */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
            <h3 className="text-xs text-gray-500 mb-2 uppercase tracking-widest">玩家列表</h3>
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2"
              >
                {/* 颜色圆点 */}
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLOR_MAP[p.colorIdx] ?? '#888' }}
                />
                <span className="flex-1 text-sm font-medium">
                  {p.name}
                  {p.id === mySocketId && (
                    <span className="ml-1 text-xs text-gray-500">（你）</span>
                  )}
                  {players[0].id === p.id && (
                    <span className="ml-1 text-xs text-yellow-500">👑</span>
                  )}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    p.ready
                      ? 'bg-green-900 text-green-400'
                      : 'bg-gray-700 text-gray-500'
                  }`}
                >
                  {p.ready ? '已准备' : '等待中'}
                </span>
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            {/* 准备按钮（非房主） */}
            {!isHost && (
              <button
                onClick={handleReady}
                className={`flex-1 font-bold py-2 rounded-lg transition ${
                  isReady
                    ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                    : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
              >
                {isReady ? '✋ 取消准备' : '✅ 准备'}
              </button>
            )}

            {/* 开始游戏（房主） */}
            {isHost && (
              <button
                onClick={handleStart}
                disabled={loading || players.length < 2}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition"
              >
                🚦 开始游戏
              </button>
            )}
          </div>

          {isHost && players.length < 2 && (
            <p className="text-yellow-600 text-xs text-center">至少需要 2 名玩家才能开始</p>
          )}

          {errMsg && <p className="text-red-400 text-xs text-center">{errMsg}</p>}
        </div>
      )}

      {/* 消息日志 */}
      {!isSinglePlayer && (
        <div className="mt-6 w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-3 max-h-32 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-600 text-xs text-center">暂无消息</p>
          ) : (
            messages.slice(-8).map((m, i) => (
              <p key={i} className="text-xs text-gray-400 leading-relaxed">
                {m}
              </p>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Lobby;
