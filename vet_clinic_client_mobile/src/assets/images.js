export const appImages = {
  booking: require('./images/booking.png'),
  homeHero: require('./images/home-hero.png'),
  loginDog: require('./images/login-wave-a.jpg'),
  settings: require('./images/settings.png'),
};

const petImages = {
  Buddy: require('./images/buddy.png'),
  Mingming: require('./images/mingming.png'),
  Max: require('./images/max.png'),
};

export function getPetImage(petOrName) {
  const name = typeof petOrName === 'string' ? petOrName : petOrName?.name;
  return petImages[name] || null;
}
