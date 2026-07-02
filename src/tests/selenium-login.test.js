const { Builder, By, until } = require('selenium-webdriver');

// Prueba End-to-End (E2E) con Selenium WebDriver
(async function testLoginBackus() {
  let driver = await new Builder().forBrowser('chrome').build();
  
  try {
    // 1. Navegar al entorno de producción (Contenedor Docker)
    await driver.get('https://dashboard-backus-mvp-docker.onrender.com');

    // 2. Esperar a que cargue la interfaz
    await driver.wait(until.titleIs('Backus - Gestión de Camiones'), 5000);

    // 3. Simular el ingreso de credenciales del operador
    await driver.findElement(By.name('email')).sendKeys('operador@backus.com');
    await driver.findElement(By.name('password')).sendKeys('secreto123');
    
    // 4. Hacer clic en el botón de Ingresar
    await driver.findElement(By.id('btn-login')).click();

    // 5. Validar que el Dashboard principal cargó exitosamente
    await driver.wait(until.elementLocated(By.id('panel-bahias')), 5000);
    console.log('Prueba Selenium Exitosa: Login y Dashboard renderizados correctamente.');
    
  } finally {
    // Cerrar el navegador de prueba
    await driver.quit();
  }
})();
