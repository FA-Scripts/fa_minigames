import { useState } from 'react'
import { clampOption, GamePanel, type GameProps } from './shared'

const RIDGES = [
  'M22 226C8 176 10 102 36 57C59 17 102 2 141 16C180 30 202 68 197 112C194 146 179 177 183 219',
  'M35 228C22 181 23 111 47 70C67 36 103 22 136 33C168 44 187 75 184 112C181 146 166 177 170 222',
  'M49 229C37 186 38 121 58 84C75 53 104 41 132 50C159 59 175 85 172 116C169 148 154 179 157 224',
  'M63 230C52 191 52 132 69 98C82 71 105 59 128 66C151 74 163 96 160 122C157 152 142 181 144 225',
  'M77 231C68 197 67 143 80 111C90 86 107 77 124 82C142 87 152 105 149 128C146 155 131 184 131 226',
  'M92 232C84 201 82 153 91 123C98 101 109 93 121 97C135 101 142 115 139 134C136 159 121 187 118 228',
  'M107 232C101 203 97 165 102 137C106 116 113 108 120 111C129 114 133 123 130 139C126 161 113 190 105 215',
  'M28 143C43 152 49 168 48 190C47 207 50 219 55 229',
  'M42 130C59 142 65 160 63 185C61 204 64 219 69 230',
  'M57 119C74 130 80 150 78 177C76 201 79 217 84 231',
  'M171 135C156 151 150 171 152 194C153 207 152 218 150 226',
  'M158 145C145 159 139 177 140 198C141 211 139 220 136 228',
  'M145 155C134 168 128 184 128 203C128 214 125 223 122 230',
  'M31 95C45 82 59 77 72 76',
  'M169 65C157 54 145 49 132 46'
]

function FingerprintGraphic({ index, slices, offset }: { index: number; slices: number; offset: number }) {
  const bandHeight = 240 / slices
  return <svg className="fingerprint__graphic" viewBox="0 0 200 240" style={{ top: `${-index * bandHeight}px`, transform: `translateX(calc(-50% + ${offset * 22}px))` }} aria-hidden="true"><g>{RIDGES.map((path, ridge) => <path key={ridge} d={path} />)}</g></svg>
}

export function Fingerprint({ options, onComplete }: GameProps) {
  const slices = clampOption(options, 'slices', 5, 3, 7)
  const [offsets, setOffsets] = useState(() => Array.from({ length: slices }, () => 1 + Math.floor(Math.random() * 4)))
  const [scanning, setScanning] = useState(false)
  const aligned = offsets.filter(value => value === 0).length
  const shift = (index: number, direction: number) => setOffsets(values => values.map((value, slice) => slice === index ? (value + direction + 5) % 5 : value))
  const scan = () => {
    setScanning(true)
    window.setTimeout(() => onComplete(aligned === slices, { aligned }), 650)
  }

  return <GamePanel eyebrow="FORENSIC READER // FA-31" title="Reconstruct the print" status={scanning ? 'SCANNING' : `${aligned}/${slices} ALIGNED`} instructions="Move each horizontal slice until every fingerprint ridge becomes continuous.">
    <div className={`fingerprint${scanning ? ' is-scanning' : ''}`}>
      <div className="fingerprint__scanner"><i className="fingerprint__beam" /><div className="fingerprint__print">{offsets.map((offset, index) => <div className="fingerprint__slice" key={index}><button onClick={() => shift(index, -1)} aria-label={`Move fingerprint slice ${index + 1} left`}><svg viewBox="0 0 20 20"><path d="m13 4-6 6 6 6" /></svg></button><span className={offset === 0 ? 'is-aligned' : ''}><FingerprintGraphic index={index} slices={slices} offset={offset} /></span><button onClick={() => shift(index, 1)} aria-label={`Move fingerprint slice ${index + 1} right`}><svg viewBox="0 0 20 20"><path d="m7 4 6 6-6 6" /></svg></button></div>)}</div></div>
      <button className="action-button" disabled={scanning} onClick={scan}>ANALYZE PRINT</button>
    </div>
  </GamePanel>
}
