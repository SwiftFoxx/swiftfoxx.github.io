const token = document.currentScript.dataset.token

const discussionNumber = 1//document.currentScript.dataset.discussion

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
            <header>
            <img src="${comment.author.avatarURL}" alt="">
            <strong>${comment.author.login}</strong>
            </header>
            <p>${comment.body}</p>
            `

            container.appendChild(el)
        })
    }

    document.querySelector(".trailing-rail").appendChild(container)
    renderComposer(discussion.id)
}

function renderComposer(discussionId) {
    const form = document.createElement("form")
    form.innerHTML = `
        <textarea placeholder="Write a comment..."></textarea>
        <button type="submit">Post</button>
    `

    form.onsubmit = async (e) => {
        e.preventDefault()

        const body = form.querySelector("textarea").value

        await fetch("/api/comment", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                discussionId,
                body
            })
        })
            .then((e) => {

            })

        location.reload()
    }

    document.querySelector("#comments").prepend(form)
}