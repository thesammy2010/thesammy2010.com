import { accessFrom } from "./api"

function response(status: number, body: unknown): Response {
    return { ok: status < 300, status, json: () => Promise.resolve(body) } as Response
}

describe("accessFrom", () => {
    it("lets in a player", async () => {
        expect(await accessFrom(response(200, { id: "p", name: "Leo" }))).toEqual({
            status: "member",
            me: { id: "p", name: "Leo" }
        })
    })

    it("lets in an admin who doesn't play", async () => {
        expect(await accessFrom(response(404, { detail: "You aren't a player" }))).toEqual({
            status: "member",
            me: null
        })
    })

    it("keeps out someone who isn't in the group", async () => {
        const denied = response(403, { detail: "Permission denied: you aren't a player in the squash group" })
        expect(await accessFrom(denied)).toEqual({ status: "denied" })
    })

    // An API without /squash yet answers with FastAPI's own 404, which mustn't
    // read as an admin who doesn't play.
    it("doesn't offer squash on an API without it", async () => {
        expect((await accessFrom(response(404, { detail: "Not Found" }))).status).toBe("error")
    })
})
