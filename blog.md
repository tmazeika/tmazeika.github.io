---
layout: default
title: Blog
---

# All Posts

{% for post in site.posts %}

- [{{ post.title }}]({{ post.url }})  
  <small class="post-meta">{{ post.date | date_to_string }} by TJ
  Mazeika</small>
  {% endfor %}
