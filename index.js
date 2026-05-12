import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicPath = path.join(__dirname, "public");
const scramjetPath = path.join(__dirname, "node_modules/@mercuryworkshop/scramjet/dist");
const libcurlPath = path.join(__dirname, "node_modules/@mercuryworkshop/libcurl-transport/dist");
const baremuxPath = path.join(__dirname, "node_modules/@mercuryworkshop/bare-mux/dist");

logging.set_level(logging.NONE);

const fastify = Fastify({
    serverFactory: (handler) => {
        return createServer()
            .on("request", (req, res) => {
                res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
                handler(req, res);
            })
            .on("upgrade", (req, socket, head) => {
                if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
                else socket.end();
            });
    },
});

fastify.register(fastifyStatic, {
    root: publicPath,
    decorateReply: true,
});

fastify.register(fastifyStatic, {
    root: scramjetPath,
    prefix: "/scram/",
    decorateReply: false,
});

fastify.register(fastifyStatic, {
    root: libcurlPath,
    prefix: "/libcurl/",
    decorateReply: false,
});

fastify.register(fastifyStatic, {
    root: baremuxPath,
    prefix: "/baremux/",
    decorateReply: false,
});

fastify.setNotFoundHandler((req, reply) => {
    return reply.code(404).type("text/html").send("<h1>404 Not Found</h1>");
});

const port = parseInt(process.env.PORT || "8080");

fastify.listen({
    port: port,
    host: "0.0.0.0",
}, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Simply Proxy listening on ${address}`);
});
