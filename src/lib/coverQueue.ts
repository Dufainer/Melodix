import { invoke } from '@tauri-apps/api/core'

const CONCURRENCY = 6

let active = 0
const queue: Array<() => void> = []

function drain() {
  while (active < CONCURRENCY && queue.length > 0) {
    active++
    queue.shift()!()
  }
}

/** Fetch cover art with global concurrency limit */
export function fetchCover(path: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    queue.push(() => {
      invoke<string | null>('get_cover_art', { path })
        .then(resolve, reject)
        .finally(() => { active--; drain() })
    })
    drain()
  })
}
