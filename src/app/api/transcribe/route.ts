/**
 * 兼容旧接口：历史版本使用 /api/transcribe，当前前端使用 /api/audio2text。
 *
 * 保留这个路由作为别名，避免外部调用方升级时突然失效，同时确保语音转写逻辑只有一份。
 */
export { POST } from "../audio2text/route";

