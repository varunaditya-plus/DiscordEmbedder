<div align="center">

# DiscordEmbedder

DiscordEmbedder is a site to help discord users **send and view videos**.

Inspired by [discord.nfp.is](https://discord.nfp.is), DiscordEmbedder was made so users can easily embed their videos</br>
when sending videos to friends.

[Installation](#installation) •
[Features](#features) •
[Notes](#notes)

<img src="https://go-skill-icons.vercel.app/api/icons?i=flask,html,js,supabase,tailwind,gcp&theme=dark" />

</div>

<h2>❔ Why this exists</h2>

For some reason, when sending video urls to friends (unless on youtube), there isnt any way to directly view the video. The user has to open the link themselves. The only way to send a video directly is by uploading the file, but as discord's upload limits have become even worse, I made this app as an alternative. **If discord increased their upload limit from 10MB (wtf discord), this app would serve no purpose**

<h2>↓ Installation</h2>

### Requirements
- [Python](https://python.org/)
- [Git](https://git-scm.com/downloads)
- [Supabase](https://supabase.com/)

### Supabase
1. Go to [supabase.com](https://supabase.com/) and create an account/login.
2. Create a (postgres) database with a table named 'discordembeds'
3. Add the following columns (with types):
4. `id (text) PRIMARY KEY | file (text) | thumbnail (text) | width (int2) | height (int2) | hash (text)`
5. Click the `Connect` button at the top, and select the 'App Frameworks' tab.
6. You will see your database's URL and ANON KEY.
7. After executing the following commands, create a `.env file` and put in the URL and ANON KEY in the same format as in the `.env.example` file.

### Commands
```bash
$ git clone https://github.com/varunaditya-plus/DiscordEmbedder.git
$ pip install -r requirements.txt
$ python app.py
```

<h2>✰ Features</h2>
DiscordEmbedder supports:

- 💯&nbsp;Free & open-source
- 🌓&nbsp;Light/Dark mode
- 🫧&nbsp;Clean UIs

<br /><br />
∗ Made by Varun<br >
Copyright © 2025 ⁠[thevarunaditya](https://github.com/thevarunaditya)
