// @vitest-environment node
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { extractTTSSegments } from '../../scripts/tts-export/extract'

function buildChapter(title: string, body: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>${title}</title></head><body>${body}</body></html>`
}

async function buildEpub(chapters: string[]): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`)
  const items = chapters.map((_, i) => `<item id="c${i}" href="ch${i}.xhtml" media-type="application/xhtml+xml"/>`).join('')
  const spine = chapters.map((_, i) => `<itemref idref="c${i}"/>`).join('')
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">t</dc:identifier>
  <dc:title>t</dc:title><dc:language>zh</dc:language></metadata>
  <manifest>${items}</manifest><spine>${spine}</spine>
</package>`)
  chapters.forEach((content, i) => zip.file(`OEBPS/ch${i}.xhtml`, content))
  return zip.generateAsync({ type: 'nodebuffer' })
}

describe('tts-export extract', () => {
  it('extracts segments per section and element', async () => {
    const epub = await buildEpub([
      buildChapter('第一章', '<h1>第一章</h1><p>今日天氣好好。</p>'),
      buildChapter('第二章', '<h1>第二章</h1><p>第二章內容。</p>'),
    ])
    const { segments, chapterTitles } = await extractTTSSegments(epub)

    expect(chapterTitles).toEqual({ 0: '第一章', 1: '第二章' })
    expect(segments.map(s => s.text)).toEqual(['第一章', '今日天氣好好。', '第二章', '第二章內容。'])
    expect(segments.map(s => s.sectionIndex)).toEqual([0, 0, 1, 1])
    expect(segments[0]!.id).toBe('0-0-0')
  })

  it('excludes footnote blocks and footnote-classed elements', async () => {
    const epub = await buildEpub([buildChapter('章', `
      <p>正文內容。</p>
      <p class="footnote">類別註腳。</p>
      <aside epub:type="footnote"><p>區塊註腳。</p></aside>
      <section role="doc-endnotes"><p>尾註內容。</p></section>
    `)])
    const { segments } = await extractTTSSegments(epub)

    expect(segments.map(s => s.text)).toEqual(['正文內容。'])
  })

  it('strips inline noteref markers so footnote numbers are not spoken', async () => {
    const epub = await buildEpub([buildChapter('章', `
      <p>買啲餸<a epub:type="noteref" href="#n1"><sup>1</sup></a>返屋企。</p>
      <p>再去<a href="#n2"><sup>2</sup></a>公園。</p>
      <p>然後<span epub:type="noteref">3</span>食飯。</p>
      <p>最後<a role="doc-noteref" href="#n4">4</a>訓覺。</p>
    `)])
    const { segments } = await extractTTSSegments(epub)

    expect(segments.map(s => s.text)).toEqual(['買啲餸返屋企。', '再去公園。', '然後食飯。', '最後訓覺。'])
  })

  it('splits long text through the shared segmenter', async () => {
    const long = '這是一段好長嘅文字，'.repeat(12) + '完結。'
    const epub = await buildEpub([buildChapter('章', `<p>${long}</p>`)])
    const { segments } = await extractTTSSegments(epub)

    expect(segments.length).toBeGreaterThan(1)
    // Segmentation must be lossless: the reader relies on the same invariant.
    expect(segments.map(s => s.text).join('')).toBe(long)
  })

  it('merges short adjacent segments within one element', async () => {
    const epub = await buildEpub([buildChapter('章', '<p>短。句。仔。</p>')])
    const { segments } = await extractTTSSegments(epub)

    expect(segments.map(s => s.text)).toEqual(['短。句。仔。'])
  })
})
