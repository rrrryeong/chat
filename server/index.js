import { createChatServer } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const { httpServer } = createChatServer();

httpServer.listen(port, () => {
  console.log(`채팅 서버 실행 중: http://localhost:${port}`);
});
