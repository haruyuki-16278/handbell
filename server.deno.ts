import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";
import { messages } from "./shared/constant.ts";

const kv = await Deno.openKv();

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  console.log(pathname);

  if (pathname.startsWith("/ws") && req.method === "GET") {
    if (req.headers.get("upgrade") === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(req);

      socket.onopen = () => {
        console.log("WebSocket connection opened");
      };
      socket.onmessage = async (message) => {
        if (message.data.includes(messages.status)) {
          const status = await kv.get(["status"]);
          socket.send(String(status.value));
        }
        if (message.data.includes(messages.next)) {
          const next = await kv.get(["next"]);
          socket.send(String(next.value));
        }
      };
      socket.onclose = () => {
        console.log("WebSocket connection closed");
      };
      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      return response;
    }
  }

  if (req.method === "GET" && pathname === "/welcome-message") {
    return new Response("jigインターンへようこそ！");
  }

  if (req.method === "GET" && pathname === "/rooms") {
    const iterable = await kv.list<Record<string, string>>({
      prefix: ["room"],
    });
    const rooms = [];
    for await (const room of iterable) {
      console.log(room)
      if (new Date().getTime() - new Date(room.value.createdAt).getTime() < 1000 * 60 * 5) {
        rooms.push({...room.value, id: room.key[1]});
      }
    }
    return new Response(JSON.stringify(rooms));
  }
  
  if (req.method === "POST" && pathname === "/rooms") {
    const data = await req.json();
    const id = crypto.randomUUID();
    await kv.set(["room", id], {
      name: data.name,
      owner: data.owner,
      createdAt: new Date().toISOString(),
    });
    return new Response(JSON.stringify({name: data.name, id: id, owner: data.owner}));
  }
  
  if (req.method === "DELETE" && pathname === "/rooms") {
    const id = url.searchParams.get("id");
    
    if (!id) {
      return new Response("id is required", { status: 400 });
    }
    await kv.delete(["room", id]);
    return new Response("deleted");
  }

  return serveDir(req, {
    fsRoot: "public",
    urlRoot: "",
    showDirListing: true,
    enableCors: true,
  });
});
