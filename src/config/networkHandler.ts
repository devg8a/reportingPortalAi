export const NETWORKS = {
  shopify: {
    queue: "shopifyQueue",
    concurrency: 2,
    limiter: {
      max: 2,
      duration: 1000
    }
  },
  meta: {
    queue: "metaQueue",
    concurrency: 10,
    limiter: {
      max: 200,
      duration: 60000
    }
  },
  ga: {
    queue: "gaQueue",
    concurrency: 5,
    limiter: {
      max: 50,
      duration: 60000
    }
  },
  adword: {
    queue: "adwordQueue",
    concurrency: 10,
    limiter: {
      max: 200,
      duration: 1000
    }
  },
  bing: {
    queue: "bingQueue",
    concurrency: 3,
    limiter: {
      max: 3,
      duration: 60000
    }
  },
  criteo: {
    queue: "criteoQueue",
    concurrency: 10,
    limiter: {
      max: 200,
      duration: 1000
    }
  },
  klaviyo: {
    queue: "klaviyoQueue",
    concurrency: 10,
    limiter: {
      max: 200,
      duration: 1000
    }
  },
  awin: {
    queue: "awinQueue",
    concurrency: 10,
    limiter: {
      max: 10,
      duration: 60000
    }
  },
  impact: {
    queue: "impactQueue",
    concurrency: 10,
    limiter: {
      max: 20,
      duration: 60000
    }
  },
  rakuten: {
    queue: "rakutenQueue",
    concurrency: 10,
    limiter: {
      max: 20,
      duration: 60000
    }
  },
  cj: {
    queue: "cjQueue",
    concurrency: 10,
    limiter: {
      max: 20,
      duration: 60000
    }
  },
  avantlink: {
    queue: "avantlinkQueue",
    concurrency: 10,
    limiter: {
      max: 20,
      duration: 60000
    }
  },
  levanta: {
    queue: "levantaQueue",
    concurrency: 10,
    limiter: {
      max: 20,
      duration: 60000
    }
  },
  pepperjam: {
    queue: "pepperjamQueue",
    concurrency: 10,
    limiter: {
      max: 20,
      duration: 60000
    }
  },
};