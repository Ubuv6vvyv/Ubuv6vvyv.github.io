import zipfile
import email
from email import policy
from email.parser import BytesParser
import io

def extract_and_merge_eml(zip_path, output_html):
    merged_content = ["<html><body><h1>Merged Flight Emails</h1>"]
    
    with zipfile.ZipFile(zip_path, 'r') as z:
        # Filter for .eml files in the zip
        eml_files = [f for f in z.namelist() if f.lower().endswith('.eml')]
        
        for file_name in eml_files:
            with z.open(file_name) as f:
                # Parse the EML content
                msg = BytesParser(policy=policy.default).parse(f)
                
                # Extract headers for context
                subject = msg.get('subject', 'No Subject')
                date = msg.get('date', 'Unknown Date')
                
                # Extract HTML body or plain text body
                body = ""
                html_part = msg.get_body(preferencelist=('html'))
                if html_part:
                    body = html_part.get_content()
                else:
                    text_part = msg.get_body(preferencelist=('plain'))
                    if text_part:
                        body = f"<pre>{text_part.get_content()}</pre>"
                
                # Append to merged list with a separator
                merged_content.append(f"<hr><h2>{subject}</h2><p><strong>Date:</strong> {date}</p>")
                merged_content.append(f"<div>{body}</div>")
    
    merged_content.append("</body></html>")
    
    # Save to the final HTML file
    with open(output_html, 'w', encoding='utf-8') as out_f:
        out_f.write("\n".join(merged_content))
    print(f"Successfully created {output_html}")

# Usage
extract_and_merge_eml('flights.zip', 'merged_flights.html')
