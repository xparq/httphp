<?php echo 'Hi from PHP!<br>'; ?>
<pre>
<div style="border: 1px solid gray;">
<?php
require 'request.php';
require 'server_vars.php';
?>
</div>
</pre>
<hr>
<a href="form.php">A (PHP-backed) FORM...</a>
<hr>
<?php
phpinfo(); 
?>
