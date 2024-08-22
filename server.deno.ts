import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";
import { messages } from "./shared/constant.ts";

const kv = await Deno.openKv();

Deno.serve(async (req) => {
  const pathname = new URL(req.url).pathname;
  console.log(pathname);
  
  if (pathname.startsWith("/ws") && req.method === "GET") {
    if (req.headers.get("upgrade") === "websocket") {
      const {socket, response} = Deno.upgradeWebSocket(req);

      socket.onopen = () => {
        console.log("WebSocket connection opened");
      }
      socket.onmessage = async (message) => {
        if (message.data.includes(messages.status)) {
          const status = await kv.get(["status"]);
          socket.send(String(status.value));
        }
        if (message.data.includes(messages.next)) {
          const next = await kv.get(["next"]);
          socket.send(String(next.value));
        }
      }
      socket.onclose = () => {
        console.log("WebSocket connection closed");
      }
      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      } 

      return response;
    }
  }

  if (req.method === "GET" && pathname === "/welcome-message") {
    return new Response("jigインターンへようこそ！");
  }

  return serveDir(req, {
    fsRoot: "public",
    urlRoot: "",
    showDirListing: true,
    enableCors: true,
  });
});
