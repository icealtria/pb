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
$ echo HAHA | curl -F c=@- https://p.hoyo.win           
url: https://p.hoyo.win/635e

$ curl https://p.hoyo.win/635e
HAHA

$ echo HAHA | curl -F c=@- https://p.hoyo.win           

'635e' already exists at https://p.hoyo.win/635e

$ echo HAHAHA | curl -X PUT -F c=@- https://p.hoyo.win/635e 
https://p.hoyo.win/635e has been updated.

$ curl https://p.hoyo.win/635e
HAHAHA

$ curl -X DELETE https://p.hoyo.win/635e
deleted
```