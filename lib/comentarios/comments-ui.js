<!-- Adicionar no <head> -->
<link rel="stylesheet" href="/lib/comentarios/comments-styles.css">

<!-- Adicionar antes do </body> -->
<script src="/lib/comentarios/comments-validator.js"></script>
<script src="/lib/comentarios/comments-api.js"></script>
<script src="/lib/comentarios/comments-ui.js"></script>

<!-- Container dos comentários -->
<div id="comments-container"></div>

<!-- Inicializar comentários -->
<script>
// Substitua pela URL real do post
const postUrl = window.location.pathname; // Ex: "/blog/tecnologia/meu-post"
initComments('comments-container', postUrl);
</script>
