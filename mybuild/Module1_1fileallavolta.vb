Imports System.IO
Imports System.Net
Imports System.Web
Imports System.Xml

Module Module1
    Sub optimize(filename As String, outputname As String)
        Using client As New WebClient()
            client.Headers(HttpRequestHeader.ContentType) = "application/x-www-form-urlencoded"
            Dim code = File.ReadAllText(filename)
            Dim params As String =
                "output_format=xml" +
                "&output_info=warnings" +
                "&output_info=errors" +
                "&output_info=compiled_code" +
                "&compilation_level=ADVANCED_OPTIMIZATIONS" +
                "&warning_level=verbose" +
                "&js_code=" + HttpUtility.UrlEncode(code)
            Dim s = 0
            While s <> -1
                s = code.IndexOf("@external", s + 1)
                If (s <> -1) Then
                    Dim line = code.Substring(s, code.IndexOf(vbCrLf, s) - s)
                    Dim include = line.Split({" "c}, StringSplitOptions.RemoveEmptyEntries)
                    params += "&js_externs=" + HttpUtility.UrlEncode(File.ReadAllText(include(1)))
                End If
            End While

            Console.WriteLine("compiling " & filename & "...")
            Dim response As String = client.UploadString("http://closure-compiler.appspot.com/compile", params)
            Dim messages = String.Empty
            Dim compiled = String.Empty
            Using reader As XmlReader = XmlReader.Create(New StringReader(response))
                While (reader.Read())
                    If (reader.NodeType = XmlNodeType.Element) Then
                        If (reader.Name = "error") OrElse (reader.Name = "warning") Then
                            Dim warn = (reader.Name = "warning")
                            If warn Then
                                Console.ForegroundColor = ConsoleColor.Yellow
                                Console.Write("WARNING ")
                                messages &= "WARNING: "
                            Else
                                Console.ForegroundColor = ConsoleColor.Red
                                Console.Write("ERROR ")
                                messages &= "ERROR: "
                            End If
                            Console.ForegroundColor = ConsoleColor.White
                            Dim txt = reader.GetAttribute("type") & " in " & reader.GetAttribute("file") & "("
                            txt &= reader.GetAttribute("lineno") & ";" & reader.GetAttribute("charno") & ") "
                            Dim line = reader.GetAttribute("line")
                            reader.Read()
                            txt &= reader.Value
                            Console.WriteLine(txt)
                            messages &= txt & vbCr
                            Console.WriteLine(line)
                            messages &= line.Replace("*/", "* /") & vbCr
                        ElseIf reader.Name = "compiledCode"
                            reader.Read()
                            compiled = reader.Value
                        End If
                    End If
                End While
            End Using
            Using outFile As New StreamWriter(New FileStream(outputname, FileMode.Create))
                outFile.WriteLine(compiled)
                If Not String.IsNullOrEmpty(messages) Then
                    outFile.WriteLine("/* messages:")
                    outFile.WriteLine(messages)
                    outFile.WriteLine("*/")
                End If
            End Using
        End Using
    End Sub

    Sub Main()
        Dim code = File.ReadAllText("index.html")
        Dim files = Directory.GetFiles(".", "*.js")
        For idx = 0 To files.Length - 1
            Dim i = files(idx)
            If i.EndsWith(".min.js") Then Continue For
            Dim o = Path.ChangeExtension(i, ".min.js")
            code = code.Replace(Path.GetFileName(i), Path.GetFileName(o))
            Dim compile = Not File.Exists(o)
            If Not compile Then
                Dim din = File.GetLastWriteTime(i)
                Dim dout = File.GetLastWriteTime(o)
                compile = din > dout
            End If
            If compile Then
                optimize(i, o)
            End If
        Next
        Console.WriteLine("writing index_final.html...")
        File.WriteAllText("index_final.html", code)

    End Sub

End Module
