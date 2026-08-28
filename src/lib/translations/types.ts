export type Translations = {
  nav: {
    home: string;
    about: string;
    services: string;
    products: string;
    catalogs: string;
    contact: string;
    getQuote: string;
  };
  footer: {
    tagline: string;
    quickLinks: string;
    services: string;
    contact: string;
    rights: string;
  };
  home: {
    hero: {
      tag: string;
      title: string;
      titleAccent: string;
      subtitle: string;
      cta: string;
      ctaSecondary: string;
    };
    stats: Array<{ value: string; label: string }>;
    howItWorks: {
      title: string;
      subtitle: string;
      steps: Array<{ title: string; desc: string }>;
    };
    whyUs: {
      title: string;
      items: Array<{ title: string; desc: string; icon: string }>;
    };
    products: {
      title: string;
      subtitle: string;
      categories: string[];
      missing: string;
      missingLink: string;
    };
    cta: {
      title: string;
      subtitle: string;
      button: string;
    };
  };
  about: {
    hero: {
      tag: string;
      title: string;
      subtitle: string;
    };
    story: {
      title: string;
      paragraphs: string[];
      years: string;
      yearsLabel: string;
    };
    values: {
      title: string;
      items: Array<{ title: string; desc: string }>;
    };
    offices: {
      title: string;
      istanbul: { title: string; desc: string };
      baghdad: { title: string; desc: string };
    };
    team: {
      title: string;
      founder: { name: string; role: string; exp: string };
      director: { name: string; role: string; exp: string };
    };
    cta: {
      title: string;
      subtitle: string;
      button: string;
    };
  };
  services: {
    hero: {
      tag: string;
      title: string;
      subtitle: string;
    };
    list: Array<{
      title: string;
      desc: string;
      icon: string;
    }>;
    pricing: {
      title: string;
      subtitle: string;
      flatFee: {
        title: string;
        desc: string;
      };
      deposit: {
        title: string;
        desc: string;
      };
      note: string;
    };
    categories: {
      title: string;
      subtitle: string;
      groups: Array<{
        title: string;
        items: string[];
      }>;
      missing: string;
      button: string;
    };
    cta: {
      title: string;
      subtitle: string;
      button: string;
    };
  };
  products: {
    hero: {
      tag: string;
      title: string;
      subtitle: string;
    };
    categories: Array<{
      name: string;
      desc: string;
      image: string;
      items: string[];
      inquiry: string;
    }>;
    cta: {
      title: string;
      subtitle: string;
      button: string;
    };
  };
  catalogs: {
    hero: {
      tag: string;
      title: string;
      subtitle: string;
    };
    grid: {
      title: string;
      subtitle: string;
    };
    comingSoon: {
      title: string;
      message: string;
    };
    download: string;
    view: string;
    cta: {
      title: string;
      subtitle: string;
      button: string;
    };
  };
  contact: {
    hero: {
      tag: string;
      title: string;
      subtitle: string;
    };
    form: {
      title: string;
      name: string;
      phone: string;
      product: string;
      quantity: string;
      budget: string;
      budgetCurrency: string;
      budgetUsd: string;
      budgetIqd: string;
      budgetShipping: string;
      budgetShippingYes: string;
      budgetShippingNo: string;
      city: string;
      details: string;
      submit: string;
      required: string;
      placeholders: {
        name: string;
        phone: string;
        product: string;
        quantity: string;
        budget: string;
        city: string;
        details: string;
      };
    };
    info: {
      title: string;
      people: Array<{ name: string; role: string; phone: string }>;
      email: string;
      hours: { title: string; lines: string[] };
    };
  };
};
