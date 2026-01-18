const token = document.currentScript.dataset.token

const discussionNumber = document.currentScript.dataset.discussion

const query = `
query {
  repository(owner: "SwiftFoxx", name: "swiftblog-feedback") {
    discussion(number: ${discussionNumber}) {
      id
      title
      body
      comments(first: 50) {
        nodes {
          id
          body
          createdAt
          author {
            login
            avatarUrl
          }
          replies(first: 50) {
            nodes {
              id
              body
              author {
                login
                avatarUrl
              }
            }
          }
        }
      }
    }
  }
}
`;

const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 8000)

fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ query }),
    signal: controller.signal
})
    .then(res => res.json())
    .then(data => {
        clearTimeout(timeoutId)
        const discussion = data.data.repository.discussion
        console.log(discussion)
        renderComments(discussion)
    })
    .catch(err => {
        if (err.name === "AbortError") {
            console.warn("Comments request timed out")
            return
        }
        console.error("Failed to load comments", err)
    })

function renderComments(discussion) {
    if (!discussion) return

    const container = document.createElement("section")
    container.id = "comments"

    if (discussion.comments.nodes.length == 0) {
        const el = document.createElement("article")
        el.className = "comment"

        el.innerHTML = `
            <p>No comments yet</p>
        `
        container.appendChild(el)
    } else {
        discussion.comments.nodes.forEach(comment => {
            const el = document.createElement("article")
            el.className = "comment"

            el.innerHTML = `
            <div class="comment-container">
                <div class="author-identity">
                    <img class="avatar-img" src="${comment.author.avatarUrl}" alt="">
                    <div class="comment-name">${comment.author.login} <span class="comment-ts">${timeAgo(comment.createdAt)}<span></div>
                </div>
                <p>${comment.body}</p>
                <div class="replies"></div>
            </div>
            `

            const repliesContainer = el.querySelector(".replies")

            comment.replies.nodes.forEach(reply => {
                const replyEl = document.createElement("div")
                replyEl.className = "reply"

                replyEl.innerHTML = `
                <div class="author-identity">
                    <img class="avatar-img" src="${reply.author.avatarUrl}" alt="">
                    <strong>${reply.author.login}</strong>
                </div>
                <p>${reply.body}</p>
        `

                repliesContainer.appendChild(replyEl)
            })

            container.appendChild(el)
        })
    }

    document.querySelector(".trailing-rail").appendChild(container)
    renderComposer(discussion.id)
}

const API_BASE = "https://comments.swiftfoxx.workers.dev"

function renderComposer(discussionId) {
    const form = document.createElement("form")
    form.innerHTML = `
        <textarea placeholder="Write a comment..."></textarea>
        <button type="submit">Post</button>
    `

    form.onsubmit = async (e) => {
        e.preventDefault()

        const body = form.querySelector("textarea").value

        await fetch(`${API_BASE}/api/comment`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                discussionId,
                body
            })
        })
            .then((data) => {
                console.log("Send", JSON.stringify(data))
            })

        // location.reload()
    }

    document.querySelector("#comments").prepend(form)
}

function timeAgo(isoString) {
    const then = new Date(isoString).getTime()
    const now = Date.now()

    const diff = Math.floor((now - then) / 1000) // seconds

    if (diff < 60) return `${diff}s ago`

    const minutes = Math.floor(diff / 60)
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    const days = Math.floor(hours / 24)
    return `${days}d ago`
}