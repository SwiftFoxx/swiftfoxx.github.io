---
layout: landing
title: SwiftBlog
description: Practical articles on building modern apps with Swift and SwiftUI.
og_image: https://swiftfoxx.github.io/swiftblog-assets/images/og/blog.og.png
keywords: Swift, SwiftUI, Apple development
---

{% for post in site.posts %}
<div class="post-card">
<a href="{{ post.url }}">
  <h3>{{ post.title }}</h3>
  <p>{{ post.description }}</p>
  <span class="date-p">
    Published <span class="date-span">{{ post.date | date: "%b %d, %Y" }}</span>
  </span>
</a>
</div>
{% endfor %}