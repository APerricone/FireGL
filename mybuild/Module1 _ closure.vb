Imports System.IO
Imports System.Net
Imports System.Text.RegularExpressions
Imports System.Web
Imports System.Xml

Module Module1
    Function optimize(code As String) As String
        Using client As New WebClient()
            client.Headers(HttpRequestHeader.ContentType) = "application/x-www-form-urlencoded"
            Dim params As String =
                "output_format=xml" +
                "&output_info=warnings" +
                "&output_info=errors" +
                "&output_info=compiled_code" +
                "&compilation_level=ADVANCED_OPTIMIZATIONS" +
                "&warning_level=verbose" +
                "&use_closure_library=true"
            If Array.IndexOf(Environment.GetCommandLineArgs(), "-d") <> -1 Then
                params += "&formatting=pretty_print"
            End If
            params += "&js_code=" + HttpUtility.UrlEncode(code)
            Dim s = 0
            While s <> -1
                s = code.IndexOf("@external", s + 1)
                If (s <> -1) Then
                    Dim line = code.Substring(s, code.IndexOf(vbCrLf, s) - s)
                    Dim include = line.Split({" "c}, StringSplitOptions.RemoveEmptyEntries)
                    params += "&js_externs=" + HttpUtility.UrlEncode(File.ReadAllText(include(1)))
                End If
            End While

            Console.WriteLine("compiling...")
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
                        ElseIf reader.Name = "compiledCode" Then
                            reader.Read()
                            compiled = reader.Value
                        End If
                    End If
                End While
            End Using
            If Not String.IsNullOrEmpty(messages) Then
                compiled += "/* messages:" + vbCrLf
                compiled += messages + vbCrLf
                compiled += "*/" + vbCrLf
            End If
            Return compiled
        End Using
    End Function

    Sub Main()
        Dim code = File.ReadAllText("index.html")
        Dim myJSRegEx = New Regex("<script.*?(src=""(\w*.js)"")?>(.*?)</script>", RegexOptions.Singleline)
        Dim alljs = myJSRegEx.Matches(code)
        Dim allTogheter = ""
        For Each m As Match In alljs
            Dim thisJs = m.Groups(2).Value
            If Not String.IsNullOrEmpty(thisJs) Then
                allTogheter += "/* ***********" + thisJs + "*********** */" + vbCrLf
                allTogheter += File.ReadAllText(thisJs)
                allTogheter += "/* *********** ************ *********** */" + vbCrLf + vbCrLf
            End If
            thisJs = m.Groups(3).Value
            If Not String.IsNullOrEmpty(thisJs) Then
                allTogheter += "/* *********** index.html(" + m.Groups(3).Index.ToString() + ") *********** */" + vbCrLf
                allTogheter += thisJs + vbCrLf
                allTogheter += "/* *********** ************ *********** */" + vbCrLf + vbCrLf
            End If
        Next
        If Array.IndexOf(Environment.GetCommandLineArgs(), "-d") <> -1 Then
            File.WriteAllText("index.html.all.js", allTogheter)
        End If
        code = myJSRegEx.Replace(code, "")
        Dim toAdd = "<script type=""text/javascript"">" + vbCrLf
        toAdd += optimize(allTogheter) + vbCrLf
        toAdd += "</script>" + vbCrLf
        code = code.Insert(alljs(0).Index, toAdd)
        File.WriteAllText("index.min.html", code)

    End Sub

End Module
