# pb - A Lightweight Pastebin Service

pb is a lightweight pastebin service built on Cloudflare Workers and D1 database, offering high performance and reliability. It supports text and file sharing with features including:

- Syntax highlighting for code snippets
- Custom expiration time (sunset)
- URL shortening
- Custom labels for pastes
- Web form for paste and file uploads

# installation

## Create D1 Database

```bash
# Create a new D1 database
wrangler d1 create pb

# The command will output a database_id, copy it to wrangler.toml:
[[d1_databases]]
binding = "DB"
database_name = "pb"
database_id = "<your-database-id>"

# Initialize database schema
wrangler d1 execute pb --remote --file=schema.sql
```

modify `wrangler.toml`

```
pnpm install
pnpm run dev
```

```
pnpm run deploy
```

# usage

## Create a Paste

```
$ echo "Hello, World!" | curl -F c=@- https://p.kururin.cc
url: https://p.kururin.cc/xyz789
secret: abcd123456789
sunset: 2024-04-01T00:00:00.000Z
```

## Sunset Parameter

You can customize the expiration time of your paste using the sunset parameter:

```
$ echo "Custom expiry" | curl -F c=@- -F sunset=1440 https://p.kururin.cc
url: https://p.kururin.cc/xyz789
secret: abcd123456789
sunset: 2024-03-25T10:00:00.000Z
```

- The sunset value is in minutes
- Example: sunset=1440 sets expiry to 24 hours
- If not specified, paste expires in 7 days

## Update a Paste

```
$ echo "Updated content" | curl -X PUT -F c=@- -F secret=abcd123456789 https://p.kururin.cc/xyz789
updated
```

## Delete a Paste

```
$ curl -X DELETE -F secret=abcd123456789 https://p.kururin.cc/xyz789
deleted
```

## Create a URL Paste

```
$ echo "https://example.com" | curl -F c=@- https://p.kururin.cc/u
url: https://p.kururin.cc/abc123
secret: efgh123456789
sunset: 2024-04-01T00:00:00.000Z
```

## Create a Paste with a Custom Label

```
$ echo "Custom labeled paste" | curl -F c=@- https://p.kururin.cc/@meow
url: https://p.kururin.cc/@meow
secret: abcd123456789
sunset: 2024-04-01T00:00:00.000Z
```

## Syntax Highlighting

Add a language identifier to the URL to enable syntax highlighting:

```
https://p.kururin.cc/jkl632/python
```

To highlight a specific line, add a line reference to the URL:

```
https://p.kururin.cc/jkl632/python#L-2
```

## Notes

- Pastes are automatically deleted after 7 days by default
- Maximum size: 2MB (due to D1 limit)
