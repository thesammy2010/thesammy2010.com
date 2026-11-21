import { useEffect } from "react"
import { useLocation } from "react-router-dom"

const SITE = "TheSammy2010"

const isSquash = (pathname: string) => pathname === "/squash" || pathname.startsWith("/squash/")

// The tab's title for a path: the squash pages are How2Squash's, as the app's
// web side, and everything else is the site's.
export function titleFor(pathname: string): string {
    return isSquash(pathname) ? "How2Squash" : SITE
}

// How2Squash's app icon, at the sizes a tab and a home screen want
const SQUASH_ICONS: Record<string, string> = {
    icon: "/icons/how2squash-32.png",
    "apple-touch-icon": "/icons/how2squash-180.png"
}

// Points each of index.html's icons at How2Squash's on a squash page, and
// back at the site's own elsewhere, keeping the site's in the link itself.
function setIcons(squash: boolean) {
    document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((link) => {
        if (link.dataset.siteHref === undefined) {
            link.dataset.siteHref = link.getAttribute("href") ?? ""
            link.dataset.siteType = link.type
        }
        link.setAttribute("href", squash ? SQUASH_ICONS[link.rel] : link.dataset.siteHref)
        // The site's .ico is told apart from its PNGs by its type
        link.type = squash ? "image/png" : link.dataset.siteType ?? ""
    })
}

// Keeps the tab's title and icon in step with the page, on every route change.
export default function PageHead() {
    const { pathname } = useLocation()
    const squash = isSquash(pathname)
    useEffect(() => {
        document.title = titleFor(pathname)
    }, [pathname])
    useEffect(() => {
        setIcons(squash)
    }, [squash])
    return null
}
