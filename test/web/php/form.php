<pre>
<?php
echo '$_REQUEST == ';
print_r($_REQUEST);
?>
</pre>
<form method="POST">
<input type="text" name="in" value="<?= $_REQUEST['submit']=='ok' ? $_REQUEST['in'] : ''?>">
<input type="submit" name="submit" value="ok">
<input type="submit" name="submit" value="clear">
</form>
