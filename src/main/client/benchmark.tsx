/// <reference path="../../typings/inferno-server.d.ts"/>
/// <reference path="../../typings/inferno-jsx.d.ts"/>

var data;

InfernoServer.renderToString(
  <html>
    <head>
      <title>{data.title}</title>
    </head>
    <body>
      <p>{data.text}</p>
      {
        data.projects ? () => {
          data.projects.map((project: any) => {
            return (
              <div>
                <a href="{project.url}">{project.name}</a>
                <p>{project.description}</p>
              </div>
            );
          });
        } : () => {
          return 'No projects';
        }
      }
    </body>
  </html>
  , document.body);
