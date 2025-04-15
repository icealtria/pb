import { Hono } from "hono";
import { FC } from "hono/jsx";

const Documentation: FC<{ url: string }> = (props: {
  url: string;
}) => (
  <div className="container">
    <h1>Pastebin Documentation</h1>

    <section>
      <h2>Notices</h2>
      <ul>
        <li>Pastes are automatically deleted after 7 days by default</li>
        <li>Maximum size: 2MB (due to D1 limit)</li>
        <li>All data may be erased without notifications</li>
        <li>A <a href={`/f`}>HTML form</a> is also provided for convenience paste and file-uploads from web browsers.</li>
      </ul>
    </section>

    <section>
      <h2>Create a Paste</h2>
      <pre className="code-block">
        <code>echo "Hello, World!" | curl -F c=@- {props.url}</code>
      </pre>
      <div className="response-example">
        <h3>Response:</h3>
        <pre>
          <code>url: {props.url}xyz789</code>
          <br />
          <code>id: abcd123456789</code>
          <br />
          <code>sunset: 2024-04-01T00:00:00.000Z</code>
        </pre>
      </div>
      <h3>Sunset Parameter</h3>
      <p>
        You can customize the expiration time of your paste using the sunset
        parameter:
      </p>
      <pre className="code-block">
        <code>echo "Custom expiry" | curl -F c=@- -F sunset=1440 {props.url}</code>
      </pre>
      <ul>
        <li>The sunset value is in seconds</li>
        <li>Example: sunset=1800 sets expiry to 30 minutes</li>
        <li>If not specified, paste expires in 7 days</li>
      </ul>
    </section>

    <section>
      <h2>Update a Paste</h2>
      <pre className="code-block">
        <code>echo "Updated content" | curl -F c=@- {props.url}abcd123456789</code>
      </pre>
      <div className="response-example">
        <h3>Response:</h3>
        <pre><code>{props.url}xyz789 updated</code></pre>
      </div>
    </section>

    <section>
      <h2>Delete a Paste</h2>
      <pre className="code-block">
        <code>curl -X DELETE {props.url}abcd123456789</code>
      </pre>
      <div className="response-example">
        <h3>Response:</h3>
        <pre><code>deleted</code></pre>
      </div>
    </section>

    <section>
      <h2>Create a URL Paste</h2>
      <pre className="code-block">
        <code>echo "https://example.com" | curl -F c=@- {props.url}u</code>
      </pre>
      <div className="response-example">
        <h3>Response:</h3>
        <pre>
          <code>url: {props.url}abc123</code>
          <br />
          <code>id: efgh123456789</code>
          <br />
          <code>sunset: 2024-04-01T00:00:00.000Z</code>
        </pre>
      </div>
    </section>

    <section>
      <h2>Create a Paste with a Custom Label</h2>
      <pre className="code-block">
        <code>echo "Custom labeled paste" | curl -F c=@- {props.url}@meow</code>
      </pre>
      <div className="response-example">
        <h3>Response:</h3>
        <pre>
          <code>url: {props.url}@meow</code>
          <br />
          <code>id: abcd123456789</code>
          <br />
          <code>sunset: 2024-04-01T00:00:00.000Z</code>
        </pre>
      </div>
    </section>

    <section>
      <h2>Syntax Highlighting</h2>
      <p>Add a language identifier to the URL to enable syntax highlighting:</p>
      <pre className="code-block">
        <code>{props.url}jkl632/python</code>
      </pre>
      <p>To highlight a specific line, add a line reference to the URL:</p>
      <pre className="code-block">
        <code>{props.url}jkl632/python#L-2</code>
      </pre>
    </section>

    <section>
      <h2>Encrypt and Decrypt a Paste</h2>
      <p>You can encrypt your paste using the <code>age</code> tool before uploading it:</p>
      <pre className="code-block">
        <code>cowsay 2333 | age -p - | curl -F c=@-  {props.url}</code>
      </pre>
      <p>Encrypt file</p>
      <pre className="code-block">
        <code>{`age -p - < file.txt | curl -F c=@-`} {props.url}</code>
      </pre>
      <p>To decrypt the paste, use the following command:</p>
      <pre className="code-block">
        <code>curl {props.url}pbksew | age -d - {`>`} decrypted.txt</code>
      </pre>
      <p>This will save the decrypted content to <code>decrypted.txt</code>.</p>
    </section>
  </div>
);

const home = new Hono();

home.get("/", (c) => {
  const url = c.req.url;
  return c.html(
    <html>
      <head>
        <title>Documentation</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
        <style>
          {`
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
            }
            h1 {
              color: #2c3e50;
              text-align: center;
              margin-bottom: 2rem;
            }
            h2 {
              color: #34495e;
              margin-top: 2rem;
              padding-bottom: 0.5rem;
              border-bottom: 2px solid #eee;
            }
            section {
              margin-bottom: 3rem;
            }
            .code-block {
              background: #f8f9fa;
              border-radius: 6px;
              padding: 1rem;
              overflow-x: auto;
              margin: 1rem 0;
            }
            .response-example {
              background: #f1f3f5;
              border-radius: 6px;
              padding: 1rem;
              margin-top: 1rem;
            }
            .response-example h3 {
              margin: 0 0 0.5rem 0;
              font-size: 0.9rem;
              color: #666;
            }
            pre {
              margin: 0;
            }
            code {
              font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
              font-size: 0.9rem;
            }
            p {
              color: #666;
              margin: 1rem 0;
            }
          `}
        </style>
      </head>
      <body>
        <Documentation url={url} />
      </body>
    </html>,
  );
});

export default home;
