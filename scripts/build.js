const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { Liquid } = require('liquidjs');

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, '_data');
const includesDir = path.join(rootDir, '_includes');
const layoutsDir = path.join(rootDir, '_layouts');
const distDir = path.join(rootDir, '_site');

function loadSiteData() {
  const site = { data: {} };

  // Load _config.yml
  const configPath = path.join(rootDir, '_config.yml');
  if (fs.existsSync(configPath)) {
    const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    Object.assign(site, config);
  }

  // Load all yaml in _data/
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir);
    for (const file of files) {
      if (file.endsWith('.yml') || file.endsWith('.yaml')) {
        const key = path.basename(file, path.extname(file));
        const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
        site.data[key] = yaml.load(content);
      }
    }
  }

  return site;
}

async function build() {
  const site = loadSiteData();

  const engine = new Liquid({
    root: [rootDir, includesDir, layoutsDir],
    extname: '.html',
    dynamicPartials: false
  });

  const indexRaw = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

  // Parse front matter
  let frontMatter = {};
  let content = indexRaw;
  const fmMatch = indexRaw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (fmMatch) {
    frontMatter = yaml.load(fmMatch[1]) || {};
    content = fmMatch[2];
  }

  // Render index content with Liquid
  const renderedContent = await engine.parseAndRender(content, { site });

  // Render layout if specified
  let finalHtml = renderedContent;
  if (frontMatter.layout) {
    const layoutPath = path.join(layoutsDir, `${frontMatter.layout}.html`);
    if (fs.existsSync(layoutPath)) {
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');
      finalHtml = await engine.parseAndRender(layoutContent, {
        site,
        content: renderedContent
      });
    }
  }

  // Ensure _site dir exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  fs.writeFileSync(path.join(distDir, 'index.html'), finalHtml, 'utf8');
  console.log('Build complete -> _site/index.html generated.');
  return finalHtml;
}

if (require.main === module) {
  build().catch(err => {
    console.error('Build error:', err);
    process.exit(1);
  });
}

module.exports = { build, loadSiteData };
