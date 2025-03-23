# installation

modify `wrangler.toml`

```
pnpm install
pnpm run dev
```

```
pnpm run deploy
```

# uasge

```
$ echo HAHA | curl -F c=@- https://p.kururin.cc           
url: https://p.kururin.cc/xxxx
secret: abcdef123456

$ curl https://p.kururin.cc/xxxx
HAHA

$ echo NEW | curl -X PUT -F c=@- -F secret=abcdef123456 https://p.kururin.cc/xxxx
updated

$ curl -X DELETE -F secret=abcdef123456 https://p.kururin.cc/xxxx
deleted
```