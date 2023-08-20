until node ../taxbears_bot
do
	echo "TaxBears bot crashed with exit code $?. Respawning.." >&2
	sleep 1
done
